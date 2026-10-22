import{ss,_i}from"./site-d92hj336.js";import{P,V}from"./site-q1pk93qz.js";import{o}from"./site-synvytjq.js";class gm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",P,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",P)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ss(e.mesh,r))&&(e.mesh===r||ss(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function xm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",gm)}xm();
export{gm,xm};

//# debugId=0AA398FB98F2CA1F64756E2164756E21
//# sourceMappingURL=site-9q29vvb7.js.map
