import{Qe}from"./site-z8mqhr1b.js";import{nt}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";import{l}from"./site-sqgademg.js";class Fc extends Qe{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",nt),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,r){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Fc.MaxLoopCount){l.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Fc.MaxLoopCount=1000;var o=!1;function gm(){if(o)return;o=!0,a("FlowGraphWhileLoopBlock",Fc)}gm();
export{Fc,gm};

//# debugId=E998C2656250471464756E2164756E21
//# sourceMappingURL=site-42k2pt9j.js.map
