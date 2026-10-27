import{_i}from"./site-v7dfb6ky.js";import{V}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class Ax extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",V),this.deltaTime=this.registerDataOutput("deltaTime",V)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Ex(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Ax)}Ex();
export{Ax,Ex};

//# debugId=96A1C641D989108664756E2164756E21
//# sourceMappingURL=site-zf7wh95r.js.map
