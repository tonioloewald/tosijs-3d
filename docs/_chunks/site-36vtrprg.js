import{ns,_i}from"./site-x0v5x8t1.js";import{w,V}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Lm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",w,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",w)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ns(e.mesh,r))&&(e.mesh===r||ns(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function Nm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",Lm)}Nm();
export{Lm,Nm};

//# debugId=ECEB5858457978EB64756E2164756E21
//# sourceMappingURL=site-36vtrprg.js.map
