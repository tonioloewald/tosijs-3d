import{is,_i}from"./site-rhk48zyv.js";import{P,V}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class gm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",P)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&is(e.mesh,r))&&(e.mesh===r||is(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function xm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",gm)}xm();
export{gm,xm};

//# debugId=544368FFA816FFD864756E2164756E21
//# sourceMappingURL=site-135cnqk3.js.map
