import{_i}from"./site-ktydmw50.js";import{V}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Lx extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",V),this.deltaTime=this.registerDataOutput("deltaTime",V)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function Nx(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",Lx)}Nx();
export{Lx,Nx};

//# debugId=698550292FFF477464756E2164756E21
//# sourceMappingURL=site-83pr9y1j.js.map
