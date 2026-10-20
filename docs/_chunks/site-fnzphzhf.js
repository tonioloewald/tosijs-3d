import{_i}from"./site-4r99kqsd.js";import{V}from"./site-ec8w6gnd.js";import{o}from"./site-jv2cv0ev.js";class Ex extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",V),this.deltaTime=this.registerDataOutput("deltaTime",V)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Ax(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Ex)}Ax();
export{Ex,Ax};

//# debugId=5EBCA91373B467CD64756E2164756E21
//# sourceMappingURL=site-fnzphzhf.js.map
