import React, { useState } 			from 'react';
import Homescreen 		from './components/homescreen/Homescreen';
import { useQuery } 	from '@apollo/client';
import * as queries 	from './cache/queries';
import { jsTPS } 		from './utils/jsTPS';
import { BrowserRouter, Switch, Route, Redirect} from 'react-router-dom';
import Spreadsheet from './components/subregion/Spreadsheet';
import Regionviewer from './components/regionviewer.js/regionviewer';
 
const App = () => {
	let user = null;
    let transactionStack = new jsTPS();
	let refreshTps = false;
    const { loading, error, data, refetch } = useQuery(queries.GET_DB_USER);

    if(error) { console.log(error); }
	if(loading) { console.log(loading); }
	if(data) { 
		let { getCurrentUser } = data;
		if(getCurrentUser !== null) { user = getCurrentUser; }
    }
	return(
		<BrowserRouter>
			<Switch>
				<Redirect exact from="/" to={ {pathname: "/home"} } />
				<Route 
					path="/home" 
					name="home" 
					render={() => 
						<Homescreen tps={transactionStack} fetchUser={refetch} user={user} refreshTps={refreshTps}/>
					} 
				/>
				<Route path = "/spreadsheet/:_id" render = {() =>
				<Spreadsheet tps={transactionStack} fetchUser={refetch} user={user} refreshTps={refreshTps} key = {Date.now()} /> } />
				<Route path = "/regionviewer/:_id" render = {() =>
				<Regionviewer tps={transactionStack} fetchUser={refetch} user={user} refreshTps={refreshTps} key = {Date.now()} /> } />
			</Switch>
		</BrowserRouter>
	);
}

export default App;