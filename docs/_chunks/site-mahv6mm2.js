import{_i}from"./site-3hzw4f8j.js";import{V}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Ox extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",V),this.deltaTime=this.registerDataOutput("deltaTime",V)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Px(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Ox)}Px();
export{Ox,Px};

//# debugId=67718C556DE5103864756E2164756E21
//# sourceMappingURL=site-mahv6mm2.js.map
