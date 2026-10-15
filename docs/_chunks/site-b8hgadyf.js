import{is,_i}from"./site-rhk48zyv.js";import{P,V}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class r_ extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",P)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&is(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||is(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function s_(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",r_)}s_();
export{r_,s_};

//# debugId=2870F6E5769D764964756E2164756E21
//# sourceMappingURL=site-b8hgadyf.js.map
