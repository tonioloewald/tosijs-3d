import{Wr as i}from"./site-gg0bpfht.js";import{bs as p}from"./site-anxkxj4p.js";import{ku as s,mu as h}from"./site-86tpqddf.js";import{sE as o}from"./site-yf4sr5jd.js";class u extends p{constructor(e){super(e);this.type="PointerOver",this.pointerId=this.registerDataOutput("pointerId",h),this.targetMesh=this.registerDataInput("targetMesh",s,e?.targetMesh),this.meshUnderPointer=this.registerDataOutput("meshUnderPointer",s)}_executeEvent(e,t){let r=this.targetMesh.getValue(e);this.meshUnderPointer.setValue(t.mesh,e);let m=t.out&&i(t.out,r);if(this.pointerId.setValue(t.pointerId,e),!m&&(t.mesh===r||i(t.mesh,r)))return this._execute(e),!this.config?.stopPropagation;return!0}_preparePendingTasks(e){}_cancelPendingTasks(e){}getClassName(){return"FlowGraphPointerOverEventBlock"}}var n=!1;function a(){if(n)return;n=!0,o("FlowGraphPointerOverEventBlock",u)}a();
export{u as Go,a as Ho};

//# debugId=BAF3D6055EC2CB5764756E2164756E21
//# sourceMappingURL=site-jyrc62as.js.map
