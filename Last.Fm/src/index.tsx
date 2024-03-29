import { Plugin, registerPlugin } from 'enmity/managers/plugins';
import { React } from 'enmity/metro/common';
import Manifest from './manifest.json';
import Settings from './components/Settings';
import { getActivity, hasKey } from './activity';
import { getByProps } from 'enmity/metro';

const ReactNative = getByProps('AppState')

const LastFM: Plugin = {
   ...Manifest,

   onStart() {
      let attempt = 0;
      const attempts = 3;
      const lateStartup = () => {
         try {
            attempt++;
            if (hasKey()) {
               getActivity()
               setInterval(() => {
                  getActivity()
               }, 20000)
            }
            const { remove } = ReactNative.AppState?.addEventListener('change', (state) => {
               if (state === 'active') {
                  if (hasKey()) {
                     getActivity()
                  }
               }
            })
            this.removeAppStateLister = remove

         } catch (err) {
            if (attempt < attempts) {
               setTimeout(lateStartup, attempt * 10000);
            } else {
               console.error(
                  `${Manifest.name} failed to start. Giving up.`
               );
            }
         }
      };

      setTimeout(() => {
         lateStartup();
      }, 300);
   },

   onStop() {
      if (this.removeAppStateLister) {
         this.removeAppStateLister()
      }
   },

   getSettingsPanel({ settings }) {
      return <Settings settings={settings} />;
   }
};

registerPlugin(LastFM);
