import{tt}from"./site-rhk48zyv.js";import{P,pt}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class Xp extends tt{constructor(e){super(e);this.body=this.registerDataInput("body",P),this.velocity=this.registerDataInput("velocity",pt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function Yp(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",Xp)}Yp();
export{Xp,Yp};

//# debugId=C7A776A04D04F5B264756E2164756E21
//# sourceMappingURL=site-5g306551.js.map
