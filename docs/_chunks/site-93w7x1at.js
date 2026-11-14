import{_i}from"./site-3t3g319r.js";import{V}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class Yx extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",V),this.deltaTime=this.registerDataOutput("deltaTime",V)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Xx(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Yx)}Xx();
export{Yx,Xx};

//# debugId=1E3158350621065164756E2164756E21
//# sourceMappingURL=site-93w7x1at.js.map
