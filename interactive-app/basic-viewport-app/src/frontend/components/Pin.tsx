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
