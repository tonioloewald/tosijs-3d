import{tt}from"./site-rhk48zyv.js";import{lt}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";import{l}from"./site-sqgademg.js";class Du extends tt{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",lt),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,a){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Du.MaxLoopCount){l.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Du.MaxLoopCount=1000;var r=!1;function n_(){if(r)return;r=!0,o("FlowGraphWhileLoopBlock",Du)}n_();
export{Du,n_};

//# debugId=356E7F7196F25CF564756E2164756E21
//# sourceMappingURL=site-p8rantxb.js.map
