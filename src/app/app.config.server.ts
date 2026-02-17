// import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
// import { provideServerRendering, withRoutes } from '@angular/ssr';
// import { appConfig } from './app.config';
// import { serverRoutes } from './app.routes.server';

// const serverConfig: ApplicationConfig = {
//   providers: [
//     provideServerRendering(withRoutes(serverRoutes))
//   ]
// };

// export const config = mergeApplicationConfig(appConfig, serverConfig);
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering()
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
