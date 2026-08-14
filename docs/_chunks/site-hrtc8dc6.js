import{lE as A}from"./site-a83ag417.js";class b{}b.POINTERDOWN=1;b.POINTERUP=2;b.POINTERMOVE=4;b.POINTERWHEEL=8;b.POINTERPICK=16;b.POINTERTAP=32;b.POINTERDOUBLETAP=64;class z{constructor(d,q){this.type=d,this.event=q}}class C extends z{constructor(d,q,w,x){super(d,q);this.ray=null,this.originalPickingInfo=null,this.skipOnPointerObservable=!1,this.localPosition=new A(w,x)}}class D extends z{get pickInfo(){if(!this._pickInfo)this._generatePickInfo();return this._pickInfo}constructor(d,q,w,x=null){super(d,q);this._pickInfo=w,this._inputManager=x}_generatePickInfo(){if(this._inputManager)this._pickInfo=this._inputManager._pickMove(this.event),this._inputManager._setRayOnPointerInfo(this._pickInfo,this.event),this._inputManager=null}}
export{b as Pv,z as Qv,C as Rv,D as Sv};

//# debugId=6A4CEC933986281864756E2164756E21
//# sourceMappingURL=site-hrtc8dc6.js.map
