import{lE as c}from"./site-gta5cdrj.js";class i{}i.POINTERDOWN=1;i.POINTERUP=2;i.POINTERMOVE=4;i.POINTERWHEEL=8;i.POINTERPICK=16;i.POINTERTAP=32;i.POINTERDOUBLETAP=64;class r{constructor(t,n){this.type=t,this.event=n}}class e extends r{constructor(t,n,s,o){super(t,n);this.ray=null,this.originalPickingInfo=null,this.skipOnPointerObservable=!1,this.localPosition=new c(s,o)}}class a extends r{get pickInfo(){if(!this._pickInfo)this._generatePickInfo();return this._pickInfo}constructor(t,n,s,o=null){super(t,n);this._pickInfo=s,this._inputManager=o}_generatePickInfo(){if(this._inputManager)this._pickInfo=this._inputManager._pickMove(this.event),this._inputManager._setRayOnPointerInfo(this._pickInfo,this.event),this._inputManager=null}}
export{i as Pv,r as Qv,e as Rv,a as Sv};

//# debugId=F485EB1D790369B964756E2164756E21
//# sourceMappingURL=site-mkbqxkt1.js.map
