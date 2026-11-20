import{_i}from"./site-x0v5x8t1.js";import{V}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class $x extends _i{constructor(){super();this.type="SceneBeforeRender",this.timeSinceStart=this.registerDataOutput("timeSinceStart",V),this.deltaTime=this.registerDataOutput("deltaTime",V)}_preparePendingTasks(e){}_executeEvent(e,t){return this.timeSinceStart.setValue(t.timeSinceStart,e),this.deltaTime.setValue(t.deltaTime,e),this._execute(e),!0}_cancelPendingTasks(e){}getClassName(){return"FlowGraphSceneTickEventBlock"}}var r=!1;function jx(){if(r)return;r=!0,o("FlowGraphSceneTickEventBlock",$x)}jx();
export{$x,jx};

//# debugId=2A0F226AA30286B664756E2164756E21
//# sourceMappingURL=site-qzsfpf76.js.map
