import{gi}from"./site-5tw2831p.js";import{k}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class gg extends gi{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",k),this.deltaTime=this.registerDataOutput("deltaTime",k)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function xg(){if(r)return;r=!0,a("FlowGraphSceneTickEventBlock",gg)}xg();
export{gg,xg};

//# debugId=F562687DC06E6D5B64756E2164756E21
//# sourceMappingURL=site-aatqtfth.js.map
