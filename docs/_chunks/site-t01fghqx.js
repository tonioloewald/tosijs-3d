import{xi}from"./site-20s7pn47.js";import{k}from"./site-xbnd7pgz.js";import{o}from"./site-6g9cre7m.js";class Rx extends xi{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",k),this.deltaTime=this.registerDataOutput("deltaTime",k)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Ix(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Rx)}Ix();
export{Rx,Ix};

//# debugId=B0893830C732013E64756E2164756E21
//# sourceMappingURL=site-t01fghqx.js.map
