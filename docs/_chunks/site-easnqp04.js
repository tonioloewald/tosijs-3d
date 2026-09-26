import{is,gi}from"./site-5tw2831p.js";import{I,k}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class Km extends gi{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",k),this.targetMesh=this.registerDataInput("targetMesh",I,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",I)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let i=t.out&&is(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!i&&(t.mesh===r||is(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var s=!1;function Jm(){if(s)return;s=!0,a("FlowGraphPointerOverEventBlock",Km)}Jm();
export{Km,Jm};

//# debugId=6AE4C89E4AB2CA1164756E2164756E21
//# sourceMappingURL=site-easnqp04.js.map
