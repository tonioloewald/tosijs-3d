import{ts,xi}from"./site-20s7pn47.js";import{I,k}from"./site-xbnd7pgz.js";import{o}from"./site-6g9cre7m.js";class vm extends xi{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",k),this.targetMesh=this.registerDataInput("targetMesh",I,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",I)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ts(e.mesh,r))&&(e.mesh===r||ts(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function bm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",vm)}bm();
export{vm,bm};

//# debugId=3D7C83809F93BE6F64756E2164756E21
//# sourceMappingURL=site-kjmfnv43.js.map
