import { get, set } from "enmity/api/settings";
import { GatewayActivity, GatewayActivityButton } from "discord-api-types/v10";
import Manifest from "./manifest.json";
import { getModule } from "enmity/metro";

interface Activity extends Partial<GatewayActivity> {
  buttons: GatewayActivityButton[] | undefined;
  assets:
    | Partial<
        Record<
          "large_image" | "large_text" | "small_image" | "small_text",
          string
        >
      >
    | undefined;
}

const { SET_ACTIVITY } = getModule((m) => typeof m.SET_ACTIVITY === "object");
const { APPLICATION_ASSETS_FETCH } = getModule(
  (m) => typeof m?.APPLICATION_ASSETS_FETCH === "object"
);

export async function fetchAssets(key: string) {
  return (
    await APPLICATION_ASSETS_FETCH("1052565934088405062", [key, undefined])
  )[0];
}

export function setActivity(activity) {
  return SET_ACTIVITY.handler({
    isSocketConnected: () => true,
    socket: {
      id: 100,
      application: {
        id: "1052565934088405062",
        name: activity ? activity.name : "Last.fm",
      },
      transport: "ipc",
    },
    args: {
      pid: 10,
      activity: activity,
    },
  });
}

export function getActivity(): Activity | undefined {
  let activity: Activity = {
    name: get(Manifest.name, "name", "Last.fm")?.toString(),
    type: 2,
    details: "",
    state: "",
    application_id: "1052565934088405062",
    assets: {},
    buttons: [],
    timestamps: {},
  };

  const fmKey = get(Manifest.name, "key", undefined)?.toString();
  const fmUser = get(Manifest.name, "user", undefined)?.toString();

  if (fmKey && fmUser) {
    const fmUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${fmUser}&api_key=${fmKey}&format=json&limit=1`;
    fetch(fmUrl)
      .then((response) => response.json())
      .then((data) => {
        //The user has to be currently listening to a song (must be playing, not paused), if not, return undefined
        if (!data.recenttracks.track[0]["@attr"]?.nowplaying) {
          set(Manifest.name, "current", "a");
          console.log("No song currently playing");
          setActivity(undefined);
          return;
        } else {
          const track = data.recenttracks.track[0];
          const artist = track.artist["#text"];
          const album = track.album["#text"];
          const name = track.name;
          if (get(Manifest.name, "current", "") == name) return false;
          const image = track.image[3]["#text"];
          activity.details = `${name}`;
          activity.state = `by ${artist}`;

          if (image) {
            activity.assets = {
              large_image: track.image[3]["#text"],
              large_text: `Album: ${album}`,
              // small_image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Youtube_Music_icon.svg/512px-Youtube_Music_icon.svg.png",
              // small_text: `Song: ${name}`,
            };
          }

          //Add a button to view the song on Last.fm
          activity.buttons = [
            {
              label: "View on Last.fm",
              url: track.url,
            },
          ];
          activity.timestamps = {
            start: Math.floor(Date.now() / 1000),
          };
          console.log(`Currently listening to ${name} by ${artist}`);
          set(Manifest.name, "current", name);
          setActivity(activity);
          return activity.name;
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        return undefined;
      });
  } else {
    setActivity(undefined);
    console.log("No Last.fm key or user set");
    return undefined;
  }
}

export function hasKey() {
  return get(Manifest.name, "key", false) && get(Manifest.name, "user", false);
}
