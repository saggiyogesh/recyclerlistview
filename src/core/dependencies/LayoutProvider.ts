import { Layout, WrapGridLayoutManager, LayoutManager, GridLayoutManager } from "../layoutmanager/LayoutManager";
import CustomError from "../exceptions/CustomError";

/**
 * Created by talha.naqvi on 05/04/17.
 * You can create a new instance or inherit and override default methods
 * You may need access to data provider here, it might make sense to pass a function which lets you fetch the latest data provider
 * Why only indexes? The answer is to allow data virtualization in the future. Since layouts are accessed much before the actual render assuming having all
 * data upfront will only limit possibilites in the future.
 *
 * By design LayoutProvider forces you to think in terms of view types. What that means is that you'll always be dealing with a finite set of view templates
 * with deterministic dimensions. We want to eliminate unnecessary re-layouts that happen when height, by mistake, is not taken into consideration.
 * This patters ensures that your scrolling is as smooth as it gets. You can always increase the number of types to handle non deterministic scenarios.
 *
 * NOTE: You can also implement features such as ListView/GridView switch by simple changing your layout provider.
 */

export abstract class BaseLayoutProvider {
    //Return your layout manager, you get all required dependencies here. Also, make sure to use cachedLayouts. RLV might cache layouts and give back to
    //in cases of conxtext preservation. Make sure you use them if provided.
    public abstract newLayoutManager(renderWindowSize: Dimension, isHorizontal?: boolean, cachedLayouts?: Layout[]): LayoutManager;

    //Given an index a provider is expected to return a view type which used to recycling choices
    public abstract getLayoutTypeForIndex(index: number): string | number;

    //Check if given dimension contradicts with your layout provider, return true for mismatches. Returning true will
    //cause a relayout to fix the discrepancy
    public abstract checkDimensionDiscrepancy(dimension: Dimension, type: string | number, index: number): boolean;
}

export class LayoutProvider extends BaseLayoutProvider {
    private _setLayoutForType: (type: string | number, dim: Dimension, index: number) => void;
    private _getLayoutTypeForIndex: (index: number) => string | number;
    private _tempDim: Dimension;
    private _lastLayoutManager: WrapGridLayoutManager | undefined;

    constructor(getLayoutTypeForIndex: (index: number) => string | number,
                setLayoutForType: (type: string | number, dim: Dimension, index: number) => void) {
        super();
        this._getLayoutTypeForIndex = getLayoutTypeForIndex;
        this._setLayoutForType = setLayoutForType;
        this._tempDim = { height: 0, width: 0 };
    }

    public newLayoutManager(renderWindowSize: Dimension, isHorizontal?: boolean, cachedLayouts?: Layout[]): LayoutManager {
        this._lastLayoutManager = new WrapGridLayoutManager(this, renderWindowSize, isHorizontal, cachedLayouts);
        return this._lastLayoutManager;
    }

    //Provide a type for index, something which identifies the template of view about to load
    public getLayoutTypeForIndex(index: number): string | number {
        return this._getLayoutTypeForIndex(index);
    }

    //Given a type and dimension set the dimension values on given dimension object
    //You can also get index here if you add an extra argument but we don't recommend using it.
    public setComputedLayout(type: string | number, dimension: Dimension, index: number): void {
        return this._setLayoutForType(type, dimension, index);
    }

    public checkDimensionDiscrepancy(dimension: Dimension, type: string | number, index: number): boolean {
        const dimension1 = dimension;
        this.setComputedLayout(type, this._tempDim, index);
        const dimension2 = this._tempDim;
        if (this._lastLayoutManager) {
            this._lastLayoutManager.setMaxBounds(dimension2);
        }
        return dimension1.height !== dimension2.height || dimension1.width !== dimension2.width;
    }
}

export class GridLayoutProvider extends LayoutProvider {
    private _setHeightForIndex: (height: number, index: number) => number;
    private _getColumnSpanForIndex: (index: number) => number;
    private _setMaxColumnSpan: () => number;
    constructor(getLayoutTypeForIndex: (index: number) => string | number,
                setHeightForIndex: (height: number, index: number) => number,
                getColumnSpanForIndex: (index: number) => number,
                setMaxColumnSpan: () => number) {
        super(getLayoutTypeForIndex, (type: string | number, dim: Dimension, index: number) => this.setComputedLayout(type, dim, index));
        this._setHeightForIndex = setHeightForIndex;
        this._getColumnSpanForIndex =  getColumnSpanForIndex;
        this._setMaxColumnSpan = setMaxColumnSpan;
    }

    public newLayoutManager(renderWindowSize: Dimension, isHorizontal?: boolean, cachedLayouts?: Layout[]): LayoutManager {
        //TODO:Muskein Start supporting Horizontal and rename columnspan to just spans
        if (isHorizontal) {
            throw new CustomError({
                message: "Horizontal support not available for Grid Layouts",
                type: "NotSupportedException",
            });
        } else {
            return new GridLayoutManager(this, renderWindowSize, this._getColumnSpanForIndex,
                this._setMaxColumnSpan(), cachedLayouts);
        }
    }

    public setMaxColumnSpan(): number {
        return this._setMaxColumnSpan();
    }

    public getColumnSpanForIndex(index: number): number {
        return this._getColumnSpanForIndex(index);
    }

    public setHeightForIndex(height: number, index: number): number {
        return this._setHeightForIndex(height, index);
    }
}

export interface Dimension {
    height: number;
    width: number;
}
