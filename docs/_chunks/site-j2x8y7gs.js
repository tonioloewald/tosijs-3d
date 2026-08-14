import{bs as I}from"./site-mwjhmfjj.js";import{mu as z}from"./site-v2rprchq.js";import{sE as H}from"./site-c9kedmgh.js";class J extends I{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",z),this.deltaTime=this.registerDataOutput("deltaTime",z)}_preparePendingTasks(q){}_executeEvent(q,A){return this.timeSinceStart.setValue(A.timeSinceStart,q),this.deltaTime.setValue(A.deltaTime,q),this._execute(q),!0}_cancelPendingTasks(q){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var D=!1;function K(){if(D)return;D=!0,H("FlowGraphSceneTickEventBlock",J)}K();
export{J as Cr,K as Dr};

//# debugId=8C073E8BEF4A1BE464756E2164756E21
//# sourceMappingURL=site-j2x8y7gs.js.map
