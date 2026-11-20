import{ns,_i}from"./site-x0v5x8t1.js";import{w,V}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Mm extends _i{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",V),this.targetMesh=this.registerDataInput("targetMesh",w,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",w)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&ns(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||ns(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function Dm(){if(s)return;s=!0,o("FlowGraphPointerOverEventBlock",Mm)}Dm();
export{Mm,Dm};

//# debugId=37B14F59883E075D64756E2164756E21
//# sourceMappingURL=site-5j7qxnqa.js.map
