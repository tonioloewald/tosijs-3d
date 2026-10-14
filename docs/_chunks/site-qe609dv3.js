import{_i}from"./site-kqwawvd6.js";import{V}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class Rx extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",V),this.deltaTime=this.registerDataOutput("deltaTime",V)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Ix(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Rx)}Ix();
export{Rx,Ix};

//# debugId=075A5202F29E13AA64756E2164756E21
//# sourceMappingURL=site-qe609dv3.js.map
