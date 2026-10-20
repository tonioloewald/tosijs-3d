import{rs,_i}from"./site-4r99kqsd.js";import{P,V}from"./site-ec8w6gnd.js";import{o}from"./site-jv2cv0ev.js";class gm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",P)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&rs(e.mesh,r))&&(e.mesh===r||rs(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function xm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",gm)}xm();
export{gm,xm};

//# debugId=4FB6BC33B74C0CB064756E2164756E21
//# sourceMappingURL=site-m4q59edr.js.map
