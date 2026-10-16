import{is,_i}from"./site-e0k6q2az.js";import{P,V}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class gm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",P)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&is(e.mesh,r))&&(e.mesh===r||is(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function xm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",gm)}xm();
export{gm,xm};

//# debugId=544368FFA816FFD864756E2164756E21
//# sourceMappingURL=site-0vcw85et.js.map
