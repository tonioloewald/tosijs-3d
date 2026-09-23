import{Ts as n}from"./site-ga6zz5bp.js";import{nt as t}from"./site-rrva3mwb.js";import{hG as s}from"./site-qd0cy957.js";class c extends n{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",t),this.deltaTime=this.registerDataOutput("deltaTime",t)}_preparePendingTasks(e){}_executeEvent(e,r){return this.timeSinceStart.setValue(r.timeSinceStart,e),this.deltaTime.setValue(r.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var i=!1;function a(){if(i)return;i=!0,s("FlowGraphSceneTickEventBlock",c)}a();
export{c as Rs,a as Ss};

//# debugId=47448F9B9F1380E064756E2164756E21
//# sourceMappingURL=site-g8wpc9bv.js.map
