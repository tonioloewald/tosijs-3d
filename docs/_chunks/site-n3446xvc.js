import{Rs as n}from"./site-7aw589yr.js";import{lt as t}from"./site-bab0thfc.js";import{fG as s}from"./site-pcap36fe.js";class c extends n{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",t),this.deltaTime=this.registerDataOutput("deltaTime",t)}_preparePendingTasks(e){}_executeEvent(e,r){return this.timeSinceStart.setValue(r.timeSinceStart,e),this.deltaTime.setValue(r.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var i=!1;function a(){if(i)return;i=!0,s("FlowGraphSceneTickEventBlock",c)}a();
export{c as Ps,a as Qs};

//# debugId=8BF13B4C9C3978FA64756E2164756E21
//# sourceMappingURL=site-n3446xvc.js.map
