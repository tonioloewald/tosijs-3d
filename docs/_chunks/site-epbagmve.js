import{_i}from"./site-tabsjb83.js";import{V}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class wx extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",V),this.deltaTime=this.registerDataOutput("deltaTime",V)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Mx(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",wx)}Mx();
export{wx,Mx};

//# debugId=2151B7E301797F9364756E2164756E21
//# sourceMappingURL=site-epbagmve.js.map
