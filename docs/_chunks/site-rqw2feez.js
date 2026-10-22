import{ss,_i}from"./site-d92hj336.js";import{P,V}from"./site-q1pk93qz.js";import{o}from"./site-synvytjq.js";class r_ extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",P)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&ss(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||ss(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function s_(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",r_)}s_();
export{r_,s_};

//# debugId=4A70DD247DC9441364756E2164756E21
//# sourceMappingURL=site-rqw2feez.js.map
