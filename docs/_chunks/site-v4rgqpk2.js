import{_i}from"./site-j6ranrbs.js";import{V}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class Nx extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",V),this.deltaTime=this.registerDataOutput("deltaTime",V)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Bx(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Nx)}Bx();
export{Nx,Bx};

//# debugId=14EF873B105E57C464756E2164756E21
//# sourceMappingURL=site-v4rgqpk2.js.map
