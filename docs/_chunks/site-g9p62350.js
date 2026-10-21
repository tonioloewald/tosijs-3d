import{_i}from"./site-nkyb6jj0.js";import{V}from"./site-9g4b0mvr.js";import{o}from"./site-1z5kawy5.js";class Ex extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",V),this.deltaTime=this.registerDataOutput("deltaTime",V)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Ax(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Ex)}Ax();
export{Ex,Ax};

//# debugId=5EBCA91373B467CD64756E2164756E21
//# sourceMappingURL=site-g9p62350.js.map
