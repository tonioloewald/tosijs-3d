import{rs,_i}from"./site-nkyb6jj0.js";import{P,V}from"./site-9g4b0mvr.js";import{o}from"./site-1z5kawy5.js";class gm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",P)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&rs(e.mesh,r))&&(e.mesh===r||rs(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function xm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",gm)}xm();
export{gm,xm};

//# debugId=4FB6BC33B74C0CB064756E2164756E21
//# sourceMappingURL=site-ma81df2e.js.map
