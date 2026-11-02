import{ns,_i}from"./site-scdwvr9t.js";import{O,V}from"./site-cb9bs1rv.js";import{o}from"./site-qd2v2bpa.js";class Tm extends _i{constructor(t){super(t);this.type="PointerOut",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",O,t?.targetMesh),this.meshOutOfPointer=this.registerDataOutput("meshOutOfPointer",O)}_executeEvent(t,e){let r=this.targetMesh.getValue(t);if(this.meshOutOfPointer.setValue(e.mesh,t),this.pointerId.setValue(e.pointerId,t),!(e.over&&ns(e.mesh,r))&&(e.mesh===r||ns(e.mesh,r)))return this._execute(t),!this.config?.stopPropagation;return!0}_preparePendingTasks(t){}_cancelPendingTasks(t){}getClassName(){return"FlowGraphPointerOutEventBlock"}}var s=!1;function Cm(){if(s)return;s=!0,o("FlowGraphPointerOutEventBlock",Tm)}Cm();
export{Tm,Cm};

//# debugId=48A4B02C342F9BC264756E2164756E21
//# sourceMappingURL=site-bsq8dgfg.js.map
