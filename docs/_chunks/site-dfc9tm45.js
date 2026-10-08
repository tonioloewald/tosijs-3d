import{ts,xi}from"./site-20s7pn47.js";import{I,k}from"./site-xbnd7pgz.js";import{o}from"./site-6g9cre7m.js";class n_ extends xi{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",k),this.targetMesh=this.registerDataInput("targetMesh",I,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",I)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&ts(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||ts(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function o_(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",n_)}o_();
export{n_,o_};

//# debugId=73245E6B23B2397864756E2164756E21
//# sourceMappingURL=site-dfc9tm45.js.map
