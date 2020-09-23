import React from "react";
import { BeButtonEvent, DecorateContext, Decorator, EventHandled, IModelApp, Marker, PrimitiveTool, Tool } from "@bentley/imodeljs-frontend";
import pinMarkerImageUrl from "./pin-marker.svg";
import { Point3d, XAndY, XYAndZ } from "@bentley/geometry-core";
import { AppState } from "./App";

export interface PinContextType {
  pinDecorator: Decorator;
  PlacePin: typeof Tool;
}

// throw programmer error in our app if someone forgets to have a provider
export const PinContext = React.createContext(new Proxy({} as PinContextType, {get() {
  throw Error("Programmer Error: cannot be consumed without a provider!");
}}));

export class PinMarker extends Marker {
  public constructor(worldLocation: XYAndZ, size: XAndY = {x: 60, y: 60}) {
    super(worldLocation, size);
    this.imageOffset = {x: 0, y: 30};
    this.setImageUrl(pinMarkerImageUrl);
  }
}

export interface PinDecorator extends Decorator {
  markers: Map<Point3d, PinMarker>;
  getPins?: () => Point3d[];
}

export interface PinProviderProps {
  appState: AppState;
  setPins: (nextPins: Point3d[]) => void;
}

export default class PinProvider
  extends React.Component<React.PropsWithChildren<PinProviderProps>>
  implements PinContextType {

  public pinDecorator: PinDecorator = (() => {
    const componentThis = this;
    return {
      markers: new Map(),
      // when registered, decorate is called by the view manager every requested frame/update
      decorate(ctx: DecorateContext) {
        const currentPins = new Set(componentThis.props.appState.pinLocations);
        for (const loc of currentPins) {
          if (!this.markers.has(loc)) this.markers.set(loc, new PinMarker(loc));
        }
        for (const [loc, marker] of this.markers) {
          if (!currentPins.has(loc)) this.markers.delete(loc);
          else marker.addDecoration(ctx);
        }
      },
    };
  })();

  public PlacePin: typeof Tool = (() => {
    const componentThis = this;
    return class PlacePin extends PrimitiveTool {
      public static toolId = "PlacePin";
      // this flyover value is actually supposed to be a key, not text. but the translator returns invalid keys
      // For a real application, see https://www.imodeljs.org/learning/frontend/localization/
      public static get flyover() { return "Place Pin"; }

      public async onDataButtonDown(ev: BeButtonEvent) {
        const nextPins = [...componentThis.props.appState.pinLocations, ev.point];
        componentThis.props.setPins( nextPins);
        this.exitTool(); // only let them place one marker at a time
        return EventHandled.Yes;
      }

      public requireWriteableTarget () { return false; } // to support read-only iModels
      // important for most applications, but we can ignore it since our scope is so small
      public onRestartTool() {}
    };
  })();

  public componentDidMount() {
    // we need to attach a translation namespace, but we won't actually setup translation
    this.PlacePin.namespace = IModelApp.i18n.registerNamespace("MyApp");
    IModelApp.tools.register(this.PlacePin);
    IModelApp.viewManager.addDecorator(this.pinDecorator);
  }

  public componentWillUnmount() {
    IModelApp.tools.unRegister(this.PlacePin.toolId);
    IModelApp.viewManager.dropDecorator(this.pinDecorator);
  }

  public render() {
    return (
      <PinContext.Provider value={this}>
        {this.props.children}
      </PinContext.Provider>
    );
  }
}
