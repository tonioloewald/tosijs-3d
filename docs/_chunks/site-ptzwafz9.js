import{is,gi}from"./site-5tw2831p.js";import{I,k}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class e_ extends gi{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",k),this.targetMesh=this.registerDataInput("targetMesh",I,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",I)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&is(e.mesh,r))&&(e.mesh===r||is(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function t_(){if(s)return;s=!0,a("FlowGraphPointerOutEventBlock",e_)}t_();
export{e_,t_};

//# debugId=3AF82DA54319431764756E2164756E21
//# sourceMappingURL=site-ptzwafz9.js.map
