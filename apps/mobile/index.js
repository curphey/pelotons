// Setup must be first - loads polyfills before any other code
import './src/setup';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
