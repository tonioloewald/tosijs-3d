import{it}from"./site-sxxg2v6h.js";import{ct}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";import{c}from"./site-h3pwfkan.js";class Nu extends it{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",ct),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,l){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Nu.MaxLoopCount){c.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Nu.MaxLoopCount=1000;var r=!1;function hg(){if(r)return;r=!0,o("FlowGraphWhileLoopBlock",Nu)}hg();
export{Nu,hg};

//# debugId=FB0E79767B95844764756E2164756E21
//# sourceMappingURL=site-jyfdtq83.js.map
