import { BeButtonEvent, DecorateContext, Decorator, EventHandled, IModelApp, Marker, PrimitiveTool } from "@bentley/imodeljs-frontend";
import pinMarkerImageUrl from "./pin-marker.svg";
import { Point3d, XAndY, XYAndZ } from "@bentley/geometry-core";

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

export const pinDecorator: PinDecorator = {
  markers: new Map(),
  // when registered, decorate is called by the view manager every requested frame/update
  decorate(ctx: DecorateContext) {
    const currentPins = new Set(this.getPins?.());
    for (const loc of currentPins) {
      if (!this.markers.has(loc)) this.markers.set(loc, new PinMarker(loc));
    }
    for (const [loc, marker] of this.markers) {
      if (!currentPins.has(loc)) this.markers.delete(loc);
      else marker.addDecoration(ctx);
    }
  },
};

export class PlacePin extends PrimitiveTool {
  public static toolId = "PlacePin";
  // this flyover value is actually supposed to be a key, not text. but the translator returns invalid keys
  // For a real application, see https://www.imodeljs.org/learning/frontend/localization/
  public static get flyover() { return "Place Pin"; }

  // we use the non-null assertion (!) operator to tell typescript even if it isn't directly
  // initialized all usages will be valid because we know `run` sets it before it's used
  private _setPins!: (nextPins: Point3d[]) => void;
  private _getPins!: () => Point3d[];

  public async onDataButtonDown(ev: BeButtonEvent) {
    const nextPins = [...this._getPins(), ev.point];
    this._setPins(nextPins);
    this.exitTool(); // only let them place one marker at a time
    return EventHandled.Yes;
  }

  public run(inGetPins: PlacePin["_getPins"], inSetPins: PlacePin["_setPins"]) {
    this._getPins = inGetPins;
    this._setPins = inSetPins;
    pinDecorator.getPins = inGetPins;
    return super.run();
  }

  public requireWriteableTarget () { return false; } // to support read-only iModels
  // important for most applications, but we can ignore it since our scope is so small
  public onRestartTool() {}
}
