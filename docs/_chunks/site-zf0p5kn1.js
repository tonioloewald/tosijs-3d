import{rs,_i}from"./site-5mxcr40t.js";import{P,V}from"./site-xahfg9zj.js";import{o}from"./site-cpxwd5wy.js";class r_ extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",P)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&rs(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||rs(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function s_(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",r_)}s_();
export{r_,s_};

//# debugId=A81F14811B89729864756E2164756E21
//# sourceMappingURL=site-zf0p5kn1.js.map
