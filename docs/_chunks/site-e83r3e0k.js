import{tt}from"./site-yk445q08.js";import{ut}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";import{l}from"./site-sqgademg.js";class Lu extends tt{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",ut),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,a){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Lu.MaxLoopCount){l.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Lu.MaxLoopCount=1000;var r=!1;function a_(){if(r)return;r=!0,o("FlowGraphWhileLoopBlock",Lu)}a_();
export{Lu,a_};

//# debugId=8E4C7D4D2104BA0164756E2164756E21
//# sourceMappingURL=site-e83r3e0k.js.map
