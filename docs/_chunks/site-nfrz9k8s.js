import{gi}from"./site-yk445q08.js";import{k}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class Rx extends gi{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",k),this.deltaTime=this.registerDataOutput("deltaTime",k)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Ix(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Rx)}Ix();
export{Rx,Ix};

//# debugId=383DBA720C9D4CE564756E2164756E21
//# sourceMappingURL=site-nfrz9k8s.js.map
