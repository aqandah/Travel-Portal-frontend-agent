import {
  outputFromObservable,
  outputToObservable
} from "./chunk-XTAQZY6G.js";
import {
  Directive,
  ElementRef,
  Input,
  NgModule,
  Output,
  input,
  output,
  setClassMetadata,
  ɵɵNgOnChangesFeature,
  ɵɵdefineDirective,
  ɵɵdefineNgModule
} from "./chunk-3JIJGLXS.js";
import {
  InjectionToken,
  NgZone,
  inject,
  ɵɵdefineInjector
} from "./chunk-ZDTX3CHU.js";
import "./chunk-BLRR33TW.js";
import "./chunk-YOEGP67K.js";
import {
  Observable,
  ReplaySubject,
  Subject,
  Subscription,
  asyncScheduler,
  switchMap,
  throttleTime
} from "./chunk-QSCL67TR.js";
import "./chunk-653SOEEV.js";

// ../node_modules/ngx-echarts/fesm2022/ngx-echarts.mjs
var NGX_ECHARTS_CONFIG = new InjectionToken("NGX_ECHARTS_CONFIG");
var ChangeFilterV2 = class {
  constructor() {
    this.subject = new ReplaySubject(1);
    this.subscriptions = new Subscription();
  }
  doFilter(changes) {
    this.subject.next(changes);
  }
  dispose() {
    this.subscriptions.unsubscribe();
  }
  notEmpty(key, handler) {
    this.subscriptions.add(this.subject.subscribe((changes) => {
      if (changes[key]) {
        const value = changes[key].currentValue;
        if (value !== void 0 && value !== null) {
          handler(value);
        }
      }
    }));
  }
  has(key, handler) {
    this.subscriptions.add(this.subject.subscribe((changes) => {
      if (changes[key]) {
        const value = changes[key].currentValue;
        handler(value);
      }
    }));
  }
  notFirst(key, handler) {
    this.subscriptions.add(this.subject.subscribe((changes) => {
      if (changes[key] && !changes[key].isFirstChange()) {
        const value = changes[key].currentValue;
        handler(value);
      }
    }));
  }
  notFirstAndEmpty(key, handler) {
    this.subscriptions.add(this.subject.subscribe((changes) => {
      if (changes[key] && !changes[key].isFirstChange()) {
        const value = changes[key].currentValue;
        if (value !== void 0 && value !== null) {
          handler(value);
        }
      }
    }));
  }
};
var NgxEchartsDirective = class _NgxEchartsDirective {
  constructor() {
    this.el = inject(ElementRef);
    this.ngZone = inject(NgZone);
    this.config = inject(NGX_ECHARTS_CONFIG);
    this.options = input(null, ...ngDevMode ? [{
      debugName: "options"
    }] : []);
    this.theme = input(this.config.theme ?? null, ...ngDevMode ? [{
      debugName: "theme"
    }] : []);
    this.initOpts = input(null, ...ngDevMode ? [{
      debugName: "initOpts"
    }] : []);
    this.merge = input(null, ...ngDevMode ? [{
      debugName: "merge"
    }] : []);
    this.autoResize = input(true, ...ngDevMode ? [{
      debugName: "autoResize"
    }] : []);
    this.loading = input(false, ...ngDevMode ? [{
      debugName: "loading"
    }] : []);
    this.loadingType = input("default", ...ngDevMode ? [{
      debugName: "loadingType"
    }] : []);
    this.loadingOpts = input(null, ...ngDevMode ? [{
      debugName: "loadingOpts"
    }] : []);
    this.chartInit = output();
    this.optionsError = output();
    this.chartClick = outputFromObservable(this.createLazyEvent("click"));
    this.chartDblClick = outputFromObservable(this.createLazyEvent("dblclick"));
    this.chartMouseDown = outputFromObservable(this.createLazyEvent("mousedown"));
    this.chartMouseMove = outputFromObservable(this.createLazyEvent("mousemove"));
    this.chartMouseUp = outputFromObservable(this.createLazyEvent("mouseup"));
    this.chartMouseOver = outputFromObservable(this.createLazyEvent("mouseover"));
    this.chartMouseOut = outputFromObservable(this.createLazyEvent("mouseout"));
    this.chartGlobalOut = outputFromObservable(this.createLazyEvent("globalout"));
    this.chartContextMenu = outputFromObservable(this.createLazyEvent("contextmenu"));
    this.chartHighlight = outputFromObservable(this.createLazyEvent("highlight"));
    this.chartDownplay = outputFromObservable(this.createLazyEvent("downplay"));
    this.chartSelectChanged = outputFromObservable(this.createLazyEvent("selectchanged"));
    this.chartLegendSelectChanged = outputFromObservable(this.createLazyEvent("legendselectchanged"));
    this.chartLegendSelected = outputFromObservable(this.createLazyEvent("legendselected"));
    this.chartLegendUnselected = outputFromObservable(this.createLazyEvent("legendunselected"));
    this.chartLegendLegendSelectAll = outputFromObservable(this.createLazyEvent("legendselectall"));
    this.chartLegendLegendInverseSelect = outputFromObservable(this.createLazyEvent("legendinverseselect"));
    this.chartLegendScroll = outputFromObservable(this.createLazyEvent("legendscroll"));
    this.chartDataZoom = outputFromObservable(this.createLazyEvent("datazoom"));
    this.chartDataRangeSelected = outputFromObservable(this.createLazyEvent("datarangeselected"));
    this.chartGraphRoam = outputFromObservable(this.createLazyEvent("graphroam"));
    this.chartGeoRoam = outputFromObservable(this.createLazyEvent("georoam"));
    this.chartTreeRoam = outputFromObservable(this.createLazyEvent("treeroam"));
    this.chartTimelineChanged = outputFromObservable(this.createLazyEvent("timelinechanged"));
    this.chartTimelinePlayChanged = outputFromObservable(this.createLazyEvent("timelineplaychanged"));
    this.chartRestore = outputFromObservable(this.createLazyEvent("restore"));
    this.chartDataViewChanged = outputFromObservable(this.createLazyEvent("dataviewchanged"));
    this.chartMagicTypeChanged = outputFromObservable(this.createLazyEvent("magictypechanged"));
    this.chartGeoSelectChanged = outputFromObservable(this.createLazyEvent("geoselectchanged"));
    this.chartGeoSelected = outputFromObservable(this.createLazyEvent("geoselected"));
    this.chartGeoUnselected = outputFromObservable(this.createLazyEvent("geounselected"));
    this.chartAxisAreaSelected = outputFromObservable(this.createLazyEvent("axisareaselected"));
    this.chartBrush = outputFromObservable(this.createLazyEvent("brush"));
    this.chartBrushEnd = outputFromObservable(this.createLazyEvent("brushend"));
    this.chartBrushSelected = outputFromObservable(this.createLazyEvent("brushselected"));
    this.chartGlobalCursorTaken = outputFromObservable(this.createLazyEvent("globalcursortaken"));
    this.chartRendered = outputFromObservable(this.createLazyEvent("rendered"));
    this.chartFinished = outputFromObservable(this.createLazyEvent("finished"));
    this.animationFrameID = null;
    this.chart$ = new ReplaySubject(1);
    this.resize$ = new Subject();
    this.changeFilter = new ChangeFilterV2();
    this.resizeObFired = false;
    this.echarts = this.config.echarts;
  }
  ngOnChanges(changes) {
    this.changeFilter.doFilter(changes);
  }
  ngOnInit() {
    if (!window.ResizeObserver) {
      throw new Error("please install a polyfill for ResizeObserver");
    }
    this.resizeSub = this.resize$.pipe(throttleTime(100, asyncScheduler, {
      leading: false,
      trailing: true
    })).subscribe(() => this.resize());
    if (this.autoResize()) {
      this.resizeOb = this.ngZone.runOutsideAngular(() => new window.ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === this.el.nativeElement) {
            if (!this.resizeObFired) {
              this.resizeObFired = true;
            } else {
              this.animationFrameID = window.requestAnimationFrame(() => {
                this.resize$.next();
              });
            }
          }
        }
      }));
      this.resizeOb.observe(this.el.nativeElement);
    }
    this.changeFilter.notFirstAndEmpty("options", (opt) => this.onOptionsChange(opt));
    this.changeFilter.notFirstAndEmpty("merge", (opt) => this.setOption(opt));
    this.changeFilter.has("loading", (v) => this.toggleLoading(!!v));
    this.changeFilter.notFirst("theme", () => this.refreshChart());
  }
  ngOnDestroy() {
    window.clearTimeout(this.initChartTimer);
    if (this.resizeSub) {
      this.resizeSub.unsubscribe();
    }
    if (this.animationFrameID) {
      window.cancelAnimationFrame(this.animationFrameID);
    }
    if (this.resizeOb) {
      this.resizeOb.unobserve(this.el.nativeElement);
    }
    if (this.loadingSub) {
      this.loadingSub.unsubscribe();
    }
    this.changeFilter.dispose();
    this.dispose();
  }
  ngAfterViewInit() {
    this.initChartTimer = window.setTimeout(() => this.initChart());
  }
  dispose() {
    if (this.chart) {
      if (!this.chart.isDisposed()) {
        this.chart.dispose();
      }
      this.chart = null;
    }
  }
  /**
   * resize chart
   */
  resize() {
    if (this.chart) {
      this.chart.resize();
    }
  }
  toggleLoading(loading) {
    if (this.chart) {
      loading ? this.chart.showLoading(this.loadingType(), this.loadingOpts()) : this.chart.hideLoading();
    } else {
      this.loadingSub = this.chart$.subscribe((chart) => loading ? chart.showLoading(this.loadingType(), this.loadingOpts()) : chart.hideLoading());
    }
  }
  setOption(option, opts) {
    if (this.chart) {
      try {
        this.chart.setOption(option, opts);
      } catch (e) {
        console.error(e);
        this.optionsError.emit(e);
      }
    }
  }
  /**
   * dispose old chart and create a new one.
   */
  async refreshChart() {
    this.dispose();
    await this.initChart();
  }
  createChart() {
    const dom = this.el.nativeElement;
    if (window && window.getComputedStyle) {
      const prop = window.getComputedStyle(dom, null).getPropertyValue("height");
      if ((!prop || prop === "0px") && (!dom.style.height || dom.style.height === "0px")) {
        dom.style.height = "400px";
      }
    }
    return this.ngZone.runOutsideAngular(() => {
      const load = typeof this.echarts === "function" ? this.echarts : () => Promise.resolve(this.echarts);
      return load().then(({
        init
      }) => init(dom, this.theme() ?? this.config?.theme, this.initOpts()));
    });
  }
  async initChart() {
    await this.onOptionsChange(this.options());
    const merge = this.merge();
    if (merge && this.chart) {
      this.setOption(merge);
    }
  }
  async onOptionsChange(opt) {
    if (!opt) {
      return;
    }
    if (this.chart) {
      this.setOption(this.options(), true);
    } else {
      this.chart = await this.createChart();
      this.chart$.next(this.chart);
      this.chartInit.emit(this.chart);
      this.setOption(this.options(), true);
    }
  }
  // allows to lazily bind to only those events that are requested through the `output()` by parent components
  // see https://stackoverflow.com/questions/51787972/optimal-reentering-the-ngzone-from-eventemitter-event for more info
  createLazyEvent(eventName) {
    return outputToObservable(this.chartInit).pipe(switchMap((chart) => new Observable((observer) => {
      chart.on(eventName, (data) => this.ngZone.run(() => observer.next(data)));
      return () => {
        if (this.chart) {
          if (!this.chart.isDisposed()) {
            chart.off(eventName);
          }
        }
      };
    })));
  }
  static {
    this.ɵfac = function NgxEchartsDirective_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NgxEchartsDirective)();
    };
  }
  static {
    this.ɵdir = ɵɵdefineDirective({
      type: _NgxEchartsDirective,
      selectors: [["echarts"], ["", "echarts", ""]],
      inputs: {
        options: [1, "options"],
        theme: [1, "theme"],
        initOpts: [1, "initOpts"],
        merge: [1, "merge"],
        autoResize: [1, "autoResize"],
        loading: [1, "loading"],
        loadingType: [1, "loadingType"],
        loadingOpts: [1, "loadingOpts"]
      },
      outputs: {
        chartInit: "chartInit",
        optionsError: "optionsError",
        chartClick: "chartClick",
        chartDblClick: "chartDblClick",
        chartMouseDown: "chartMouseDown",
        chartMouseMove: "chartMouseMove",
        chartMouseUp: "chartMouseUp",
        chartMouseOver: "chartMouseOver",
        chartMouseOut: "chartMouseOut",
        chartGlobalOut: "chartGlobalOut",
        chartContextMenu: "chartContextMenu",
        chartHighlight: "chartHighlight",
        chartDownplay: "chartDownplay",
        chartSelectChanged: "chartSelectChanged",
        chartLegendSelectChanged: "chartLegendSelectChanged",
        chartLegendSelected: "chartLegendSelected",
        chartLegendUnselected: "chartLegendUnselected",
        chartLegendLegendSelectAll: "chartLegendLegendSelectAll",
        chartLegendLegendInverseSelect: "chartLegendLegendInverseSelect",
        chartLegendScroll: "chartLegendScroll",
        chartDataZoom: "chartDataZoom",
        chartDataRangeSelected: "chartDataRangeSelected",
        chartGraphRoam: "chartGraphRoam",
        chartGeoRoam: "chartGeoRoam",
        chartTreeRoam: "chartTreeRoam",
        chartTimelineChanged: "chartTimelineChanged",
        chartTimelinePlayChanged: "chartTimelinePlayChanged",
        chartRestore: "chartRestore",
        chartDataViewChanged: "chartDataViewChanged",
        chartMagicTypeChanged: "chartMagicTypeChanged",
        chartGeoSelectChanged: "chartGeoSelectChanged",
        chartGeoSelected: "chartGeoSelected",
        chartGeoUnselected: "chartGeoUnselected",
        chartAxisAreaSelected: "chartAxisAreaSelected",
        chartBrush: "chartBrush",
        chartBrushEnd: "chartBrushEnd",
        chartBrushSelected: "chartBrushSelected",
        chartGlobalCursorTaken: "chartGlobalCursorTaken",
        chartRendered: "chartRendered",
        chartFinished: "chartFinished"
      },
      exportAs: ["echarts"],
      features: [ɵɵNgOnChangesFeature]
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgxEchartsDirective, [{
    type: Directive,
    args: [{
      standalone: true,
      selector: "echarts, [echarts]",
      exportAs: "echarts"
    }]
  }], null, {
    options: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "options",
        required: false
      }]
    }],
    theme: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "theme",
        required: false
      }]
    }],
    initOpts: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "initOpts",
        required: false
      }]
    }],
    merge: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "merge",
        required: false
      }]
    }],
    autoResize: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "autoResize",
        required: false
      }]
    }],
    loading: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "loading",
        required: false
      }]
    }],
    loadingType: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "loadingType",
        required: false
      }]
    }],
    loadingOpts: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "loadingOpts",
        required: false
      }]
    }],
    chartInit: [{
      type: Output,
      args: ["chartInit"]
    }],
    optionsError: [{
      type: Output,
      args: ["optionsError"]
    }],
    chartClick: [{
      type: Output,
      args: ["chartClick"]
    }],
    chartDblClick: [{
      type: Output,
      args: ["chartDblClick"]
    }],
    chartMouseDown: [{
      type: Output,
      args: ["chartMouseDown"]
    }],
    chartMouseMove: [{
      type: Output,
      args: ["chartMouseMove"]
    }],
    chartMouseUp: [{
      type: Output,
      args: ["chartMouseUp"]
    }],
    chartMouseOver: [{
      type: Output,
      args: ["chartMouseOver"]
    }],
    chartMouseOut: [{
      type: Output,
      args: ["chartMouseOut"]
    }],
    chartGlobalOut: [{
      type: Output,
      args: ["chartGlobalOut"]
    }],
    chartContextMenu: [{
      type: Output,
      args: ["chartContextMenu"]
    }],
    chartHighlight: [{
      type: Output,
      args: ["chartHighlight"]
    }],
    chartDownplay: [{
      type: Output,
      args: ["chartDownplay"]
    }],
    chartSelectChanged: [{
      type: Output,
      args: ["chartSelectChanged"]
    }],
    chartLegendSelectChanged: [{
      type: Output,
      args: ["chartLegendSelectChanged"]
    }],
    chartLegendSelected: [{
      type: Output,
      args: ["chartLegendSelected"]
    }],
    chartLegendUnselected: [{
      type: Output,
      args: ["chartLegendUnselected"]
    }],
    chartLegendLegendSelectAll: [{
      type: Output,
      args: ["chartLegendLegendSelectAll"]
    }],
    chartLegendLegendInverseSelect: [{
      type: Output,
      args: ["chartLegendLegendInverseSelect"]
    }],
    chartLegendScroll: [{
      type: Output,
      args: ["chartLegendScroll"]
    }],
    chartDataZoom: [{
      type: Output,
      args: ["chartDataZoom"]
    }],
    chartDataRangeSelected: [{
      type: Output,
      args: ["chartDataRangeSelected"]
    }],
    chartGraphRoam: [{
      type: Output,
      args: ["chartGraphRoam"]
    }],
    chartGeoRoam: [{
      type: Output,
      args: ["chartGeoRoam"]
    }],
    chartTreeRoam: [{
      type: Output,
      args: ["chartTreeRoam"]
    }],
    chartTimelineChanged: [{
      type: Output,
      args: ["chartTimelineChanged"]
    }],
    chartTimelinePlayChanged: [{
      type: Output,
      args: ["chartTimelinePlayChanged"]
    }],
    chartRestore: [{
      type: Output,
      args: ["chartRestore"]
    }],
    chartDataViewChanged: [{
      type: Output,
      args: ["chartDataViewChanged"]
    }],
    chartMagicTypeChanged: [{
      type: Output,
      args: ["chartMagicTypeChanged"]
    }],
    chartGeoSelectChanged: [{
      type: Output,
      args: ["chartGeoSelectChanged"]
    }],
    chartGeoSelected: [{
      type: Output,
      args: ["chartGeoSelected"]
    }],
    chartGeoUnselected: [{
      type: Output,
      args: ["chartGeoUnselected"]
    }],
    chartAxisAreaSelected: [{
      type: Output,
      args: ["chartAxisAreaSelected"]
    }],
    chartBrush: [{
      type: Output,
      args: ["chartBrush"]
    }],
    chartBrushEnd: [{
      type: Output,
      args: ["chartBrushEnd"]
    }],
    chartBrushSelected: [{
      type: Output,
      args: ["chartBrushSelected"]
    }],
    chartGlobalCursorTaken: [{
      type: Output,
      args: ["chartGlobalCursorTaken"]
    }],
    chartRendered: [{
      type: Output,
      args: ["chartRendered"]
    }],
    chartFinished: [{
      type: Output,
      args: ["chartFinished"]
    }]
  });
})();
function provideEchartsCore(config) {
  return {
    provide: NGX_ECHARTS_CONFIG,
    useValue: config
  };
}
var NgxEchartsModule = class _NgxEchartsModule {
  static forRoot(config) {
    return {
      ngModule: _NgxEchartsModule,
      providers: [provideEchartsCore(config)]
    };
  }
  static forChild() {
    return {
      ngModule: _NgxEchartsModule
    };
  }
  static {
    this.ɵfac = function NgxEchartsModule_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NgxEchartsModule)();
    };
  }
  static {
    this.ɵmod = ɵɵdefineNgModule({
      type: _NgxEchartsModule,
      imports: [NgxEchartsDirective],
      exports: [NgxEchartsDirective]
    });
  }
  static {
    this.ɵinj = ɵɵdefineInjector({});
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgxEchartsModule, [{
    type: NgModule,
    args: [{
      imports: [NgxEchartsDirective],
      exports: [NgxEchartsDirective]
    }]
  }], null, null);
})();
export {
  NGX_ECHARTS_CONFIG,
  NgxEchartsDirective,
  NgxEchartsModule,
  provideEchartsCore
};
//# sourceMappingURL=ngx-echarts.js.map
