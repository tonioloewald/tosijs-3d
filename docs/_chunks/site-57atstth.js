import{ts,gi}from"./site-yk445q08.js";import{I,k}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class vm extends gi{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",k),this.targetMesh=this.registerDataInput("targetMesh",I,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",I)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ts(e.mesh,r))&&(e.mesh===r||ts(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function bm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",vm)}bm();
export{vm,bm};

//# debugId=2EEA3DFF71CA10E464756E2164756E21
//# sourceMappingURL=site-57atstth.js.map
