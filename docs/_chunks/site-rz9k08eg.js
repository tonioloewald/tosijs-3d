import{tt}from"./site-y503zpga.js";import{lt}from"./site-davp9rnk.js";import{o}from"./site-rj733z8c.js";import{l}from"./site-sqgademg.js";class Lu extends tt{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",lt),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,a){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Lu.MaxLoopCount){l.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Lu.MaxLoopCount=1000;var r=!1;function a_(){if(r)return;r=!0,o("FlowGraphWhileLoopBlock",Lu)}a_();
export{Lu,a_};

//# debugId=FC6A65E5E57A263C64756E2164756E21
//# sourceMappingURL=site-rz9k08eg.js.map
