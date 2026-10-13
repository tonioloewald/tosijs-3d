import{_i}from"./site-23z3qe8v.js";import{k}from"./site-xp6e2pbe.js";import{o}from"./site-6fgvbfwz.js";class Rx extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",k),this.deltaTime=this.registerDataOutput("deltaTime",k)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Ix(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Rx)}Ix();
export{Rx,Ix};

//# debugId=FA139C51D121CD2764756E2164756E21
//# sourceMappingURL=site-zwsm7wtd.js.map
