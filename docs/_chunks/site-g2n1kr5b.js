import{gi}from"./site-c6g1b76s.js";import{k}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class gg extends gi{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",k),this.deltaTime=this.registerDataOutput("deltaTime",k)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function xg(){if(r)return;r=!0,a("FlowGraphSceneTickEventBlock",gg)}xg();
export{gg,xg};

//# debugId=F562687DC06E6D5B64756E2164756E21
//# sourceMappingURL=site-g2n1kr5b.js.map
